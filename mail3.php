<?php
	//****************************************
	//edit here
	$senderName = 'WEB';
	$senderEmail = 'site@example.com';
	$targetEmail = 'target@example.com';
	$messageSubject = 'Message from web-site';
	$redirectToReferer = true;
	$redirectURL = 'thankyou.html';
	//****************************************

	// mail content
	$ufiles = $_FILES['ufiles'];

	// prepare message text
	$messageText =	'Images: '.$ufiles."\n";

	// email attachment
	$senderName = "=?UTF-8?B?" . base64_encode($senderName) . "?=";
	$messageSubject = "=?UTF-8?B?" . base64_encode($messageSubject) . "?=";
	$headers = "From: " . $senderName . " <" . $senderEmail . ">";
	$semi_rand = md5(time());
	$mime_boundary = "==Multipart_Boundary_x{$semi_rand}x";
	$headers .= "\nMIME-Version: 1.0\n" . "Content-Type: multipart/mixed;\n" . " boundary=\"{$mime_boundary}\"";
	$messageText = "This is a multi-part message in MIME format.\n\n" . "--{$mime_boundary}\n" . "Content-Type: text/plain; charset=UTF-8\n\n" . $messageText . "\n\n";

	// preparing attachments
	for($x=0;$x<count($ufiles['name']);$x++){
		if($ufiles['name'][$x] != '') {
			$messageText .= "--{$mime_boundary}\n";
			$fcontent = file_get_contents($ufiles['tmp_name'][$x]);
			$data = chunk_split(base64_encode($fcontent));
			$fname = $ufiles['name'][$x];
			$messageText .= "Content-Type: {\"application/octet-stream\"};\n" . " name=\"$fname\"\n" .
			"Content-Disposition: attachment;\n" . " filename=\"$fname\"\n" .
			"Content-Transfer-Encoding: base64\n\n".$data."\n\n";
		}
	}

	// send email (validate adress before sending)
	if (preg_match('/^[_.0-9a-z-]+@([0-9a-z][0-9a-z-]+.)+[a-z]{2,4}$/',$targetEmail,$matches))
	mail($targetEmail, $messageSubject, $messageText, $headers);

	// redirect
	if($redirectToReferer) {
		header("Location: ".@$_SERVER['HTTP_REFERER'].'#sent');
	} else {
		header("Location: ".$redirectURL);
	}
?>